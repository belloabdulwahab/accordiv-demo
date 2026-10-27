export default function IssuerDetails({ issuer, draft = false }) {
  return (
    <div className="issuer-preview">
      <h2>{draft ? 'Current business details' : 'Issued business snapshot'}</h2>
      <p className="preserve-text">
        <strong>{issuer.name}</strong>
        {issuer.contact && issuer.contact !== issuer.name && (
          <>
            <br />
            {issuer.contact}
          </>
        )}
        {[issuer.email, issuer.phone, issuer.address, issuer.website]
          .filter(Boolean)
          .map((line, index) => (
            <span key={index}>
              <br />
              {line}
            </span>
          ))}
      </p>
      {draft && (
        <p className="field-hint">
          Draft previews use current settings. Issuance saves these business details with the
          invoice.
        </p>
      )}
    </div>
  );
}
