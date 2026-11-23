/** Validates the directives and delimiters accepted by the custom format editor. */
export function validateExcelCode(value: string): boolean {
  if (!value) return false;
  let quoted = false;
  let sections = 1;
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character === '\\') {
      if (++index === value.length) return false;
      continue;
    }
    if (character === '"') {
      if (quoted && value[index + 1] === '"') index++;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === ';' && ++sections > 4) return false;
    if (character === ']') return false;
    if (character !== '[') continue;
    const end = value.indexOf(']', index + 1);
    if (end < 0 || !validDirective(value.slice(index + 1, end))) return false;
    index = end;
  }
  return !quoted;
}

function validDirective(value: string): boolean {
  if (/^(?:black|blue|cyan|green|magenta|red|white|yellow)$/i.test(value)) return true;
  const color = /^color(\d{1,2})$/i.exec(value);
  if (color) return Number(color[1]) >= 1 && Number(color[1]) <= 56;
  if (/^[hms]+$/i.test(value)) return true;
  if (/^(?:<=|>=|<>|<|>|=)[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return true;
  return /^\$[^\]]*-[0-9a-f]{3,4}$/i.test(value);
}
