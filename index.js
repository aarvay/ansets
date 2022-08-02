import axios from "axios"

const base_url = "https://blockstream.info/api";
const block_height = 680000;
const allTxns = new Map();
const computed = new Map();
const counts = [];

(async () => {
  const { data: hash } = await axios.get(base_url + `/block-height/${block_height}`);
  const { data: block } = await axios.get(base_url + `/block/${hash}`)

  for (let i = 0; i < block.tx_count; i += 25) {
    console.log("Fetching from " + base_url + `/block/${hash}/txs/${i}`)
    
    const { data: txns } = await axios.get(base_url + `/block/${hash}/txs/${i}`);
    for (const txn of txns) {
      allTxns.set(txn.txid, txn.vin.map((inp) => inp.txid))
    }
  }

  const computeCount = (txn) => {
    if (computed.has(txn)) return computed.get(txn);
  
    const parents = allTxns.get(txn).filter(parent => allTxns.has(parent));
    if (parents.length == 0) {
      computed.set(txn, 0);
      return 0
    }

    const total = parents.length
    for (parent of parents) {
      total = computeCount(parent) + total;
    }
    computed.set(txn, total);
    return total
  }
  
  for (const [txn, _] of allTxns.entries()) {
    counts.push({
      txid: txn,
      count: computeCount(txn),
    });
  }

  counts.sort((a, b) => a.sum < b.sum);

  console.dir(counts.slice(0, 10))

})()
