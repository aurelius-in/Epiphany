export const metadata = {
  title: 'Epiphany AI Art Studio',
  description: 'Create and explore with diffusion and video generation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,700;1,700&family=Metal+Mania&family=Poppins:wght@400;500;600&family=Satisfy&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body className="theme-dark">{children}</body>
    </html>
  );
}
