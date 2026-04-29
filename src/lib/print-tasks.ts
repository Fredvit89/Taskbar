import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Task } from "@/types/task";

const fmt = (n: number) =>
  n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

interface PrintCtx {
  getContainerWeight: (name: string) => number;
  getPalletWeight: (name: string) => number;
  getCounterpartyCurrency?: (name: string) => string;
  isAdmin?: boolean;
}

export const printTasks = (tasks: Task[], ctx: PrintCtx) => {
  if (tasks.length === 0) return;
  const showPrice = !!ctx.isAdmin;

  const sorted = [...tasks].sort((a, b) =>
    (a.dueDate || "").localeCompare(b.dueDate || "")
  );

  let grandPallets = 0;
  let grandBoxes = 0;
  let grandNet = 0;
  let grandGross = 0;
  let grandSum = 0;

  const cards = sorted
    .map((task) => {
      const dateLabel = task.dueDate
        ? format(parseISO(task.dueDate), "EEEE, d MMMM yyyy", { locale: pl })
        : "—";

      let tPallets = 0;
      let tBoxes = 0;
      let tNet = 0;
      let tGross = 0;
      let tSum = 0;
      const cur = ctx.getCounterpartyCurrency?.(task.counterparty) ?? "PLN";

      const rows = task.items
        .map((it) => {
          const boxes = it.pallets * it.boxesPerPallet;
          const net = boxes * it.boxWeight;
          const cw = ctx.getContainerWeight(it.container);
          const pw = ctx.getPalletWeight(it.palletType);
          const gross = boxes * (it.boxWeight + cw) + it.pallets * pw;
          const price = it.pricePerKg ?? 0;
          const sum = net * price;
          tPallets += it.pallets;
          tBoxes += boxes;
          tNet += net;
          tGross += gross;
          tSum += sum;
          const cal =
            typeof it.caliberMin === "number" || typeof it.caliberMax === "number"
              ? `${it.caliberMin ?? "?"}–${it.caliberMax ?? "?"} mm`
              : "—";
          return `
            <tr>
              <td>${esc((it.sorts ?? []).join(", ") || "—")}</td>
              <td class="num">${esc(cal)}</td>
              <td>${esc(it.container || "—")}</td>
              <td>${esc(it.palletType || "—")}</td>
              <td class="num">${it.pallets}</td>
              <td class="num">${it.boxesPerPallet}</td>
              <td class="num">${boxes}</td>
              <td class="num">${fmt(it.boxWeight)}</td>
              <td class="num">${fmt(net)}</td>
              <td class="num">${fmt(gross)}</td>
              ${showPrice ? `<td class="num">${price > 0 ? fmt(price) + " " + cur : "—"}</td><td class="num">${price > 0 ? fmt(sum) + " " + cur : "—"}</td>` : ""}
              <td>${esc(it.notes || "")}</td>
            </tr>`;
        })
        .join("");

      grandPallets += tPallets;
      grandBoxes += tBoxes;
      grandNet += tNet;
      grandGross += tGross;
      grandSum += tSum;

      return `
        <section class="card">
          <header class="card-h">
            <div>
              <div class="cp">${esc(task.counterparty)}</div>
              <div class="dt">${esc(dateLabel)}${task.truckPlate ? ` · 🚚 <span class="plate">${esc(task.truckPlate)}</span>` : ""}</div>
            </div>
            <div class="sum">
              ${tPallets} palet · ${tBoxes} op. · ${fmt(tNet)} / ${fmt(tGross)} kg${showPrice && tSum > 0 ? ` · <strong>${fmt(tSum)} ${cur}</strong>` : ""}
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th>Odmiana</th><th>Kaliber</th><th>Opakowanie</th><th>Paleta</th>
                <th>Pal.</th><th>Op./pal.</th><th>Op.</th>
                <th>Waga op. (kg)</th><th>Netto (kg)</th><th>Brutto (kg)</th>
                ${showPrice ? "<th>Cena/kg</th><th>Suma (PLN)</th>" : ""}
                <th>Uwagi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<title>Zaznaczone zadania — wydruk</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111; margin: 16px; font-size: 11px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 10px; margin-bottom: 12px; }
  .card { border: 1px solid #999; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; page-break-inside: avoid; }
  .card-h { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; }
  .cp { font-weight: 700; font-size: 13px; }
  .dt { color: #555; font-size: 10px; text-transform: capitalize; }
  .sum { font-weight: 600; font-size: 11px; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-size: 10px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tfoot { font-weight: 700; }
  .grand { margin-top: 8px; padding: 8px 10px; border: 2px solid #333; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; }
  .plate { font-family: monospace; font-weight: 700; background: #eee; padding: 1px 4px; border-radius: 3px; }
  @media print { body { margin: 8mm; } .no-print { display: none; } }
  .toolbar { margin-bottom: 12px; }
  button { padding: 6px 12px; font-size: 12px; cursor: pointer; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Drukuj</button>
    <button onclick="window.close()">Zamknij</button>
  </div>
  <h1>Wydruk zadań</h1>
  <div class="meta">${tasks.length} zadań · wygenerowano ${esc(format(new Date(), "d MMM yyyy, HH:mm", { locale: pl }))}</div>
  ${cards}
  <div class="grand">
    <span>Razem (${tasks.length} zadań)</span>
    <span>${grandPallets} palet · ${grandBoxes} op. · ${fmt(grandNet)} / ${fmt(grandGross)} kg</span>
  </div>
  <script>setTimeout(function(){window.print();}, 300);</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
};
