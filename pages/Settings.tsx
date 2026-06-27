import { useState } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { loadSettings, saveSettings, GameSettings } from "@/lib/saveSystem";

import { useFullscreen } from "@/hooks/useFullscreen";

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [, navigate] = useLocation();
  const [settings, setSettings] = useState<GameSettings>(loadSettings());
  const [saved, setSaved] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  function update<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveSettings(settings);
    if (settings.darkMode !== isDarkMode) toggleDarkMode();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const dark = isDarkMode;
  const bg   = dark ? "bg-gray-950" : "bg-white";
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-200";
  const tx   = dark ? "text-white"  : "text-gray-900";
  const sub  = dark ? "text-gray-400" : "text-gray-500";
  const divider = dark ? "border-gray-800" : "border-gray-200";

  const optBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
      active
        ? dark ? "bg-white text-black" : "bg-gray-900 text-white"
        : dark ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-600"
    }`;

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className={`rounded-xl border ${card} overflow-hidden mb-4`}>
        <div className={`px-4 py-2.5 border-b ${divider}`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${sub}`}>{title}</p>
        </div>
        <div className="divide-y divide-inherit">{children}</div>
      </div>
    );
  }

  function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
    return (
      <div className={`flex items-center justify-between px-4 py-3 border-b ${divider} last:border-0`}>
        <div className="mr-4">
          <p className={`text-sm font-medium ${tx}`}>{label}</p>
          {desc && <p className={`text-xs mt-0.5 ${sub}`}>{desc}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">{children}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${dark?"bg-gray-950 border-gray-800":"bg-white border-gray-200"} border-b px-4 py-4 flex items-center justify-between`}>
        <button onClick={() => navigate("/")} className={`text-sm font-medium ${sub}`}>
          ← Voltar
        </button>
        <h1 className={`text-base font-bold ${tx}`}>Configurações</h1>
        <button onClick={handleSave}
          className={`text-sm font-bold px-4 py-1.5 rounded-lg transition-colors ${
            saved
              ? "bg-green-600 text-white"
              : dark ? "bg-white text-black" : "bg-gray-900 text-white"
          }`}>
          {saved ? "✓ Salvo" : "Salvar"}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-10">

        {/* SAVE */}
        <Section title="💾 Save">
          <Row label="Auto-save" desc="Quando o jogo salva automaticamente">
            <button className={optBtn(settings.autoSave==='off')} onClick={()=>update('autoSave','off')}>Desligado</button>
            <button className={optBtn(settings.autoSave==='after_match')} onClick={()=>update('autoSave','after_match')}>Após partida</button>
            <button className={optBtn(settings.autoSave==='monthly')} onClick={()=>update('autoSave','monthly')}>Mensal</button>
          </Row>
          <Row label="Slot do auto-save" desc="Qual slot será usado no save automático">
            {[1,2,3].map(n => (
              <button key={n} className={optBtn(settings.autoSaveSlot===n)} onClick={()=>update('autoSaveSlot',n)}>
                Slot {n}
              </button>
            ))}
          </Row>
        </Section>

        {/* PARTIDA */}
        <Section title="⚽ Partida">
          <Row label="Velocidade padrão" desc="Velocidade inicial da simulação">
            <button className={optBtn(settings.matchSpeed===1)} onClick={()=>update('matchSpeed',1)}>1×</button>
            <button className={optBtn(settings.matchSpeed===2)} onClick={()=>update('matchSpeed',2)}>2×</button>
            <button className={optBtn(settings.matchSpeed===4)} onClick={()=>update('matchSpeed',4)}>4×</button>
          </Row>
        </Section>

        {/* INTERFACE */}
        <Section title="🎨 Interface">
          <Row label="Tema" desc="Aparência do jogo">
            <button className={optBtn(!settings.darkMode)} onClick={()=>update('darkMode',false)}>Claro</button>
            <button className={optBtn(settings.darkMode)} onClick={()=>update('darkMode',true)}>Escuro</button>
          </Row>
          <Row label="Modo Exibição" desc="Alternar tela cheia">
            <button className={optBtn(true)} onClick={toggleFullscreen}>
              {isFullscreen ? "Sair da Tela Cheia" : "Entrar em Tela Cheia"}
            </button>
          </Row>
          <Row label="Idioma">
            <button className={optBtn(settings.language==='pt')} onClick={()=>update('language','pt')}>PT</button>
            <button className={optBtn(settings.language==='en')} onClick={()=>update('language','en')}>EN</button>
          </Row>
          <Row label="Moeda" desc="Formato de exibição de valores">
            <button className={optBtn(settings.currency==='BRL')} onClick={()=>update('currency','BRL')}>R$</button>
            <button className={optBtn(settings.currency==='USD')} onClick={()=>update('currency','USD')}>$</button>
            <button className={optBtn(settings.currency==='EUR')} onClick={()=>update('currency','EUR')}>€</button>
          </Row>
          <Row label="Formato de data">
            <button className={optBtn(settings.dateFormat==='dd/mm')} onClick={()=>update('dateFormat','dd/mm')}>DD/MM</button>
            <button className={optBtn(settings.dateFormat==='mm/dd')} onClick={()=>update('dateFormat','mm/dd')}>MM/DD</button>
          </Row>
        </Section>

        {/* NOTIFICAÇÕES */}
        <Section title="🔔 Notificações">
          <Row label="Alertas de lesão" desc="Notificar quando jogador se machucar">
            <button className={optBtn(settings.showInjuryAlerts)} onClick={()=>update('showInjuryAlerts',true)}>Sim</button>
            <button className={optBtn(!settings.showInjuryAlerts)} onClick={()=>update('showInjuryAlerts',false)}>Não</button>
          </Row>
          <Row label="Alertas financeiros" desc="Notificar sobre saldo negativo">
            <button className={optBtn(settings.showFinanceAlerts)} onClick={()=>update('showFinanceAlerts',true)}>Sim</button>
            <button className={optBtn(!settings.showFinanceAlerts)} onClick={()=>update('showFinanceAlerts',false)}>Não</button>
          </Row>
        </Section>

        {/* SOBRE */}
        <Section title="ℹ️ Sobre">
          <div className={`px-4 py-3 text-xs ${sub} space-y-1`}>
            <p>Elite Manager v0.1.0</p>
            <p>Motor de partida: v1.0</p>
            <p>Temporada: 2026</p>
            <p>Clubes: 20 · Jogadores: ~500</p>
          </div>
        </Section>

      </div>
    </div>
  );
}
