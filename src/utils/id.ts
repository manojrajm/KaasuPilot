/**
 * Time-sortable unique ID: `<prefix>_<timestamp base36>_<random base36>`.
 * The random part (~62 bits) makes collisions practically impossible even when
 * several rows are created in the same millisecond.
 */
export function createId(prefix: string): string {
  const time = Date.now().toString(36).padStart(9, '0');
  let random = '';
  for (let i = 0; i < 12; i++) {
    random += Math.floor(Math.random() * 36).toString(36);
  }
  return `${prefix}_${time}_${random}`;
}
