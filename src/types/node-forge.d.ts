declare module 'node-forge' {
  interface ForgePublicKey {
    encrypt(data: string, scheme: string): string;
  }

  interface ForgeApi {
    pki: {
      publicKeyToPem(key: { n: string; e: string }): string;
      publicKeyFromPem(pem: string): ForgePublicKey;
    };
    util: {
      encode64(value: string): string;
      encodeUtf8(value: string): string;
      bytesToHex(value: string): string;
    };
    random: {
      getBytesSync(length: number): string;
    };
  }

  const forge: ForgeApi;
  export default forge;
}
