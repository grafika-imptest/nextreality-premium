// Pomocný výpis textu, obrázků a odkazů ze stránky (pro sběr reálného obsahu)
const [,, url, max = 3000] = process.argv;
const h = await (await fetch(url)).text();
const main = (h.match(/<main[\s\S]*?<\/main>/) || [h])[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
const text = main.replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|h\d|li|div|a|span)>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').split('\n').map(s => s.trim()).filter(Boolean).filter((s, i, a) => a[i - 1] !== s).join('\n');
console.log(text.slice(0, +max));
const imgs = [...new Set([...main.matchAll(/(?:src|data-src|srcset)="(\/www\/upload\/[^" ,]+)/g)].map(m => m[1]))].slice(0, 30);
console.log('\n--IMGS--\n' + imgs.join('\n'));
const links = [...new Set([...main.matchAll(/href="(\/[^"#?]+)"/g)].map(m => m[1]))].slice(0, 80);
console.log('\n--LINKS--\n' + links.join(' '));
