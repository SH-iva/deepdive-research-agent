// Three drifting colour blobs: teal, blue-violet, and coral as the opposite.
// Their size and position follow <html data-depth="...">, set in App.
export default function LiveBackground() {
  return (
    <div className="bg" aria-hidden="true">
      <i className="b1" />
      <i className="b2" />
      <i className="b3" />
    </div>
  );
}
