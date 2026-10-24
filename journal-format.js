// 투자 일지 본문을 읽기 좋은 마크다운으로 정리한다.
// 웹 대시보드(브라우저)와 Cowork 내보내기(Node, vm 으로 로드)가 같은 규칙을 쓰도록 의존성 없는 일반 스크립트로 둔다.
//  - 이미 줄바꿈이 있는 글은 작성자가 구조를 잡은 것으로 보고 그대로 둔다.
//  - 한 줄짜리 긴 글은: 맨 앞 [제목] → 굵은 제목, 문장마다 줄바꿈, ①②③ → 목록, "라벨: 내용" → 굵은 라벨,
//    " | " 로 이어 붙인 자동 기록은 항목별 줄로 나눈다.
var JOURNAL_KIND_LABELS = {
  AUTO: '자동 기록', NOTE: '메모', IDEA: '아이디어', BUY: '매수', SELL: '매도',
  REVIEW: '회고', COWORK: 'Cowork', TRADE: '체결',
};

function journalToMarkdown(body) {
  var text = String(body == null ? '' : body).trim();
  if (!text) return '';
  if (/\n/.test(text)) return text.replace(/^\[([^\]]{1,80})\]\s*/, '**$1** · ');

  var out = [];
  var rest = text;
  var m = rest.match(/^\[([^\]]{1,80})\]\s*/);
  if (m) {
    out.push('**' + m[1] + '**');
    rest = rest.slice(m[0].length);
  }

  var segs = rest.indexOf(' | ') >= 0 ? rest.split(/\s*\|\s*/) : rest.split(/(?<=[.!?。])\s+(?=\S)/);
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i].trim();
    if (!seg) continue;
    var parts = seg.split(/\s*(?=[①-⑳])/);
    var head = parts[0];
    var items = parts.slice(1);
    if (/^[①-⑳]/.test(head)) { items.unshift(head); head = ''; }
    if (head) out.push(boldLabel(head));
    if (items.length) out.push(items.map(function (it) { return '- ' + boldLabel(it.replace(/^[①-⑳]\s*/, '').trim()); }).join('\n'));
  }
  return out.join('\n\n');
}

// 문장 앞의 "라벨: 내용" 에서 라벨을 굵게. 시각(09:30)처럼 숫자로 끝나는 경우는 제외.
function boldLabel(s) {
  return s.replace(/^([^:：\s*][^:：]{0,59}?[^\d\s:：])\s*[:：](\s+|$)/, function (all, label, sp) {
    // "…확정(제안: …)" 처럼 괄호 안의 콜론은 라벨이 아님
    if ((label.match(/\(/g) || []).length !== (label.match(/\)/g) || []).length) return all;
    return '**' + label + ':**' + (sp ? ' ' : '');
  });
}

if (typeof globalThis !== 'undefined') {
  globalThis.journalToMarkdown = journalToMarkdown;
  globalThis.JOURNAL_KIND_LABELS = JOURNAL_KIND_LABELS;
}
