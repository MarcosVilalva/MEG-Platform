type FileIconProps = { label: 'PDF' | 'XLS'; color: string };

function FileDownloadIcon({ label, color }: FileIconProps) {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false" className="meg-datagrid-file-icon">
      <path d="M5 5a3 3 0 0 1 3-3h11l8 8v17a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"
        fill="#0b1f1c" stroke="#e8f5f2" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19 2v5a3 3 0 0 0 3 3h5" fill="none" stroke="#e8f5f2" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 9.5v6.5M12.8 13.2 16 16.4l3.2-3.2" fill="none" stroke={color}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h22v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill={color} />
      <text x="16" y="27.6" textAnchor="middle" fontSize="7.2" fontWeight="800"
        fontFamily="Inter, Arial, sans-serif" fill="#fff">{label}</text>
    </svg>
  );
}

export const PdfIcon = () => <FileDownloadIcon label="PDF" color="#ef4444" />;
export const XlsxIcon = () => <FileDownloadIcon label="XLS" color="#22c55e" />;
