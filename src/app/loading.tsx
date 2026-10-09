export default function Laden() {
  return (
    <main
      id="inhalt"
      tabIndex={-1}
      className="flex flex-1 items-center justify-center px-sicher"
    >
      <p
        role="status"
        className="flex items-center gap-klein text-text-gedaempft"
      >
        <span
          aria-hidden="true"
          className="size-klein rounded-rund bg-akzent motion-safe:animate-pulsieren"
        />
        Lädt …
      </p>
    </main>
  );
}
