// Dados reais (FC26) prontos para uso como Patch padrão do jogo.
// Gerado automaticamente -- não editar à mão, foi convertido de FC26_20250921.csv

import realPatchDataRaw from './realPatchData.json';
import type { PatchData } from './patchSystem';

export const defaultRealPatch: PatchData = realPatchDataRaw as unknown as PatchData;
