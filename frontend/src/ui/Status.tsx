export function ErrorBox({ error }: { error?: string }) {
  return error ? <div className="error">{error}</div> : null;
}
export function SuccessBox({ message }: { message?: string }) {
  return message ? <div className="success">{message}</div> : null;
}
