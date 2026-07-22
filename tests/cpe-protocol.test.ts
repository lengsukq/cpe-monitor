import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildXmlRequest,
  decodeHtmlEntities,
  escapeXml,
  extractXmlTag,
  isCpeAuthenticationFailure,
  parseCpeRecord,
} from '../src/lib/cpe-protocol.ts';

test('XML request builder escapes user-controlled values', () => {
  const xml = buildXmlRequest({
    username: 'admin<&"\'',
    count: 2,
  });
  assert.match(xml, /<username>admin&lt;&amp;&quot;&apos;<\/username>/);
  assert.match(xml, /<count>2<\/count>/);
});

test('flat XML and JSON-like records normalize to strings', () => {
  assert.deepEqual(parseCpeRecord('<response><name>A&amp;B</name><count>2</count></response>'), {
    name: 'A&B',
    count: '2',
  });
  assert.deepEqual(parseCpeRecord({ response: { enabled: true, count: 3 } }), {
    enabled: 'true',
    count: '3',
  });
});

test('XML extraction decodes HTML entities', () => {
  assert.equal(extractXmlTag('<root><token>a&#x2F;b&#x3D;c</token></root>', 'token'), 'a/b=c');
  assert.equal(decodeHtmlEntities('&lt;ok&gt;'), '<ok>');
  assert.equal(escapeXml('<ok>'), '&lt;ok&gt;');
});

test('authentication failures are recognized from status, HTML, and CPE codes', () => {
  assert.equal(isCpeAuthenticationFailure(401, ''), true);
  assert.equal(isCpeAuthenticationFailure(200, '<title>Login</title>'), true);
  assert.equal(isCpeAuthenticationFailure(200, '<error><code>125002</code></error>'), true);
  assert.equal(isCpeAuthenticationFailure(200, '<response>ok</response>'), false);
});
