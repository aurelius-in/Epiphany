export default function HomePage() {
  return (
    <main style={{height:'100vh', width:'100vw', padding:0, margin:0}}>
      <iframe
        src="/index.html"
        title="Epiphany"
        style={{border:'none', width:'100%', height:'100%'}}
      />
    </main>
  );
}
