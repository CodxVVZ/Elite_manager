import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import { GameProvider } from "./contexts/GameContext";
import { TransferProvider } from "./contexts/TransferContext";
import Home from "./pages/Home";
import NewGame from "./pages/NewGame";
import Game from "./pages/Game";
import Editor from "./pages/Editor";
import DatabaseEditor from "./pages/DatabaseEditor";
import Settings from "./pages/Settings";
import { useEffect, useState } from "react";
import { loadActivePatchToMemory } from "@/lib/teams";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/new-game"} component={NewGame} />
      <Route path={"/game"} component={Game} />
      <Route path={"/editor"} component={Editor} />
      <Route path={"/db-editor"} component={DatabaseEditor} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [loaded, setLoaded] = useState(false);
  const [hasPatch, setHasPatch] = useState(false);

  useEffect(() => {
    loadActivePatchToMemory().then((res) => {
      setHasPatch(res);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <div className="flex h-screen items-center justify-center font-bold text-gray-400">CARREGANDO DADOS...</div>;

  if (!hasPatch && window.location.pathname !== "/editor" && window.location.pathname !== "/db-editor") {
      window.location.replace("/editor");
      return null;
  }

  return (
    <ErrorBoundary>
      <GameProvider>
        <TransferProvider>
          <DarkModeProvider>
            <ThemeProvider
              defaultTheme="light"
            >
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </ThemeProvider>
          </DarkModeProvider>
        </TransferProvider>
      </GameProvider>
    </ErrorBoundary>
  );
}

export default App;
