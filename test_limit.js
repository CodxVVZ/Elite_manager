const limit = (playersStr) => {
  const sortedData = [...playersStr].sort((a, b) => (b.ovrParam || 0) - (a.ovrParam || 0));
  const selected = [];
  const posCount = {};
  const maxPos = { GK: 3, CB: 5, LB: 4, RB: 4, CDM: 4, CM: 4, CAM: 4, LM: 4, RM: 4, LW: 4, RW: 4, ST: 4 };

  // First pass: Fill up to maxPos limits
  for (const p of sortedData) {
    const pos = p.position;
    const max = maxPos[pos] || 3;
    if ((posCount[pos] || 0) < max) {
      selected.push(p);
      posCount[pos] = (posCount[pos] || 0) + 1;
    }
  }

  // Second pass: fill up to 25 if needed
  if (selected.length < 25) {
    for (const p of sortedData) {
      if (selected.length >= 25) break;
      if (!selected.includes(p)) {
        const pos = p.position;
        if (pos === 'GK' && (posCount[pos] || 0) >= 3) continue; // Never more than 3 GKs
        selected.push(p);
        posCount[pos] = (posCount[pos] || 0) + 1;
      }
    }
  }

  return selected.slice(0, 25);
};
console.log(limit([
    { position: 'GK', ovrParam: 95 },
    { position: 'GK', ovrParam: 88 },
    { position: 'GK', ovrParam: 70 },
    { position: 'GK', ovrParam: 65 },
    { position: 'GK', ovrParam: 78 },
    { position: 'GK', ovrParam: 65 },
    { position: 'GK', ovrParam: 65 },
    { position: 'GK', ovrParam: 63 },
    { position: 'GK', ovrParam: 65 },
    { position: 'CB', ovrParam: 90 },
    { position: 'CB', ovrParam: 80 }
]).filter(p => p.position === 'GK').length)
