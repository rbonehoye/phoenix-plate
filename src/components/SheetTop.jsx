import Icon from './Icon.jsx';

// Grab handle plus a close button for bottom sheets.
export default function SheetTop({ onClose }) {
  return (
    <div className="sheet-top">
      <div className="grip" />
      <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
