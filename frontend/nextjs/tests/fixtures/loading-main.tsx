import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  NavigationLoaderProvider,
  NavigationContent,
  useNavigationTask,
} from "../../components/ui-loader";

function Fixture() {
  const [a, setA] = useState(false),
    [b, setB] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useNavigationTask(a);
  useNavigationTask(b);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const after = (action: () => void, ms: number) => {
    timers.current.push(setTimeout(action, ms));
  };
  return (
    <>
      <header
        data-loading-shell="top"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          background: "white",
          padding: 12,
        }}
      >
        <button
          onClick={() => {
            setA(true);
            after(() => setA(false), 60);
          }}
        >
          Fast 60ms
        </button>
        <button
          onClick={() => {
            setA(true);
            after(() => setA(false), 60);
            after(() => setB(true), 100);
          }}
        >
          A then B
        </button>
        <button onClick={() => setA(true)}>Start</button>
        <button
          onClick={() => {
            setA(false);
            setB(false);
          }}
        >
          Finish
        </button>
      </header>
      <NavigationContent>
        <main style={{ height: "360vh", padding: 24, background: "#fffaf3" }}>
          <h1>Long page</h1>
          <button>Content action</button>
        </main>
      </NavigationContent>
      <footer data-loading-shell="bottom" style={{ height: 90 }}>
        Footer
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <NavigationLoaderProvider>
    <Fixture />
  </NavigationLoaderProvider>,
);
