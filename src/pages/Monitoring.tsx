export default function Monitoring() {
  const apiHost = window.location.host.replace(/^admin\./, "api.");
  const monitorUrl = `${window.location.protocol}//${apiHost}/monitor`;

  return (
    <div className="h-full w-full -m-6">
      <iframe
        src={monitorUrl}
        className="w-full h-full border-0"
        style={{ minHeight: "calc(100vh - 64px)" }}
        title="Server Monitor"
      />
    </div>
  );
}
