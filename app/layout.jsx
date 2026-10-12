import './globals.css';

export const metadata = {
  title: 'Agentheek — AI Chat with Tools & Skills',
  description:
    'A streaming AI chat powered by Google Gemini. Supports image input, live tool calls, and extensible skills.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
