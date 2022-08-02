import axios from "axios";
import fs from "fs";

const base_url = "https://blockstream.info/api";
const block_height = 680000;

(async () => {
  const allTxns = new Map();
  const { data: hash } = await axios.get(
    base_url + `/block-height/${block_height}`
  );
  const { data: block } = await axios.get(base_url + `/block/${hash}`);

  let api_cache = {};

  fs.readFile("data/response.json", "utf8", function (err, data) {
    if (err) {
      console.log("Error reading cache");
    } else {
      api_cache = JSON.parse(data);
    }
  });

  for (let i = 0; i < block.tx_count; i += 25) {
    const url = base_url + `/block/${hash}/txs/${i}`;
    const txns = [];
    if (api_cache[url]) {
      txns.push(...api_cache[url]);
    } else {
      console.log("Fetching from " + url);
      const { data } = await axios.get(url);
      api_cache[url] = data;
      txns.push(...data);
    }

    for (const txn of txns) {
      allTxns.set(
        txn.txid,
        txn.vin.map((inp) => inp.txid)
      );
    }
  }
  const json = JSON.stringify(api_cache);
  fs.writeFile("data/response.json", json, "utf8", (err) => {
    if (err) {
      console.log("Error writing to cache", err);
    } else {
      console.log("Successfully wrote to cache");
    }
  });

  const counts = new Map();
  for (const [txn, parents] of allTxns.entries()) {
    const count = (txnn) => {
      if (counts.has(txnn)) return;
      if (!parents.length) counts.set(txnn, 0);
      let parentCounts = new Array(parents.length).fill(0);
      let i = 0;
      for (let i = 0; i < parents.length; i++) {
        if (allTxns.has(parents[i])) {
          // check if its in the same block
          if (counts.has(parents[i]))
            // check if already computed
            parentCounts[i] = 1 + counts.get(parents[i]);
          else {
            const parentCount = count(parents[i]) + 1;
            counts.set(parents[i], parentCount);
            parentCounts[i] = parentCount;
          }
        }
      }
      const tot = parentCounts.reduce((acc, val) => acc + val, 0);
      counts.set(txnn, tot);
    };

    count(txn);
  }

  const result = Array.from(counts, ([txid, count]) => ({ txid, count }));
  result.sort(function (a, b) {
    return b.count - a.count;
  });
  console.dir(result.slice(0, 10));
})();
