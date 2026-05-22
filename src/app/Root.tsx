import { BrowserRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from 'next-themes';
import App from './App.tsx';
import { OutputView } from './OutputView.tsx';

export function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/output"
          element={
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
              <OutputView />
            </ThemeProvider>
          }
        />
        <Route
          path="/*"
          element={
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="lumina-theme">
              <App />
            </ThemeProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
