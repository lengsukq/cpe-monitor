/**
 * CpeSmsReader — handles SMS message retrieval and parsing from CPE device.
 *
 * Extracted from CpeClient to enforce Single Responsibility Principle.
 */
import { extractXmlTag, isCpeAuthenticationFailure } from './cpe-protocol';
import { buildXmlRequest } from './cpe-protocol';
import { decryptSmsEnvelope, generateHexNonce } from './cpe-crypto';
import type { CpeAuthenticator } from './cpe-authenticator';
import type { CpeSmsMessage } from '@/types/cpe';
import { parseCpeRecord } from './cpe-protocol';

const SMS_PAGE_SIZE = 50;
const SMS_MAX_PAGES = 20;

export class CpeSmsReader {
  private auth: CpeAuthenticator;

  constructor(auth: CpeAuthenticator) {
    this.auth = auth;
  }

  async getSmsCount(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.auth.apiGet('/api/sms/sms-count'));
  }

  async getSmsMessages(): Promise<{ messages: CpeSmsMessage[]; count: Record<string, string> }> {
    const readSnapshot = async () => {
      const count = await this.getSmsCount();
      const contacts = await this.fetchContactMessages();
      const messages = await this.fetchPhoneMessages(contacts);

      const source = messages.length > 0 ? messages : contacts;
      const unique = new Map<string, CpeSmsMessage>();
      for (const message of source) unique.set(message.id, message);
      return {
        messages: [...unique.values()].sort((a, b) => b.date.localeCompare(a.date)),
        count,
      };
    };

    let result = await readSnapshot();
    const expectedMessages = Number(result.count.LocalInbox || 0);
    if (expectedMessages > 0 && result.messages.length === 0) {
      const ok = await this.auth.relogin();
      if (!ok) throw new Error(this.auth.getLastLoginError());
      result = await readSnapshot();
    }
    return result;
  }

  parseSmsMessages(xml: string): CpeSmsMessage[] {
    if (!xml || /<error[\s>]/i.test(xml)) return [];
    const messages: CpeSmsMessage[] = [];
    const blocks = xml.matchAll(/<message>([\s\S]*?)<\/message>/gi);
    for (const block of blocks) {
      const item = block[1];
      const phone = extractXmlTag(item, 'phone');
      const content = extractXmlTag(item, 'content');
      const date = extractXmlTag(item, 'date');
      const status = extractXmlTag(item, 'smstat');
      const type = extractXmlTag(item, 'smstype');
      const box = extractXmlTag(item, 'curbox');
      const index = extractXmlTag(item, 'index');
      if (!phone && !content && !date) continue;
      messages.push({
        id: index || `${phone}|${date}|${content}`,
        phone: phone || '-',
        content,
        date,
        status,
        type,
        box,
        unread: status === '0',
        direction: box === '0' ? 'inbound' : 'outbound',
      });
    }
    return messages;
  }

  private async fetchContactMessages(): Promise<CpeSmsMessage[]> {
    const contacts: CpeSmsMessage[] = [];
    for (let page = 1; page <= SMS_MAX_PAGES; page += 1) {
      const xml = await this.apiPostEncrypted('/api/sms/sms-list-contact', {
        pageindex: page,
        readcount: SMS_PAGE_SIZE,
      });
      const pageMessages = this.parseSmsMessages(xml);
      if (pageMessages.length === 0) break;
      contacts.push(...pageMessages);
      if (pageMessages.length < SMS_PAGE_SIZE) break;
    }
    return contacts;
  }

  private async fetchPhoneMessages(contacts: CpeSmsMessage[]): Promise<CpeSmsMessage[]> {
    const phoneNumbers = [...new Set(contacts.map((m) => m.phone).filter(Boolean))];
    const messages: CpeSmsMessage[] = [];
    for (const phone of phoneNumbers) {
      for (let page = 1; page <= SMS_MAX_PAGES; page += 1) {
        const xml = await this.apiPostEncrypted('/api/sms/sms-list-phone', {
          phone,
          pageindex: page,
          readcount: SMS_PAGE_SIZE,
        }, true);
        const pageMessages = this.parseSmsMessages(xml);
        if (pageMessages.length === 0) break;
        messages.push(...pageMessages);
        if (pageMessages.length < SMS_PAGE_SIZE) break;
      }
    }
    return messages;
  }

  private async apiPostEncrypted(
    path: string,
    data: Record<string, string | number>,
    encryptPhone = false,
    retry = true,
  ): Promise<string> {
    const encryptedAttempt = await this.auth.withRequestLock(async () => {
      await this.auth.ensureLogin();
      await this.auth.refreshToken();

      const firstNonce = generateHexNonce();
      const secondNonce = generateHexNonce();
      const requestData: Record<string, string | number> = {
        ...data,
        nonce: this.auth.rsaEncrypt(firstNonce + secondNonce),
        hmac_len: 32,
      };
      if (encryptPhone && typeof requestData.phone === 'string') {
        requestData.phone = this.auth.rsaEncrypt(requestData.phone);
      }
      const requestXml = buildXmlRequest(requestData);
      const result = await this.auth.postWithSession(
        path,
        requestXml,
        encryptPhone
          ? 'application/x-www-form-urlencoded; charset=UTF-8;enp'
          : 'application/x-www-form-urlencoded; charset=UTF-8',
      );
      return { result, firstNonce, secondNonce };
    });

    const { result, firstNonce, secondNonce } = encryptedAttempt;
    if (retry && isCpeAuthenticationFailure(result.status, result.text)) {
      const ok = await this.auth.relogin(result.sessionId);
      if (!ok) throw new Error(this.auth.getLastLoginError());
      return this.apiPostEncrypted(path, data, encryptPhone, false);
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`API request failed: ${result.status}`);
    }

    const xml = result.text;
    if (/<error[\s>]/i.test(xml)) return '';
    this.auth.persistSession();

    const encrypted = extractXmlTag(xml, 'pwd');
    const hash = extractXmlTag(xml, 'hash');
    const iterations = Number(extractXmlTag(xml, 'iter'));
    if (!encrypted || !hash || !iterations) return xml;

    return decryptSmsEnvelope({
      encryptedHex: encrypted,
      expectedHash: hash,
      iterations,
      firstNonce,
      secondNonce,
    });
  }
}
