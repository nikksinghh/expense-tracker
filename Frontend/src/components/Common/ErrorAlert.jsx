import { BsExclamationCircleFill, BsExclamationTriangleFill, BsCheckCircleFill, BsInfoCircleFill, BsX, BsArrowRight } from 'react-icons/bs';

/**
 * Reusable high-visibility Error Alert / Section Component
 * Provides immediate feedback with one-click resolution actions.
 */
const ErrorAlert = ({
  error,
  type = 'error',
  onClear,
  actionText,
  onAction,
  actionLink,
  className = '',
  style = {}
}) => {
  if (!error) return null;

  const message = typeof error === 'string'
    ? error
    : error?.message || error?.error || 'An error occurred. Please try again.';

  const isWarning = type === 'warning' || error?.code === 'EMAIL_NOT_VERIFIED';
  const isSuccess = type === 'success';
  const isInfo = type === 'info';

  const palette = isSuccess
    ? {
        bg: 'var(--rm-green-light, #dcfce7)',
        border: 'rgba(34, 197, 94, 0.4)',
        text: '#14532d',
        icon: <BsCheckCircleFill color="var(--rm-green, #22c55e)" size={18} />
      }
    : isWarning
    ? {
        bg: 'var(--rm-orange-light, #fff3e4)',
        border: 'rgba(249, 115, 22, 0.4)',
        text: '#7c2d12',
        icon: <BsExclamationTriangleFill color="var(--rm-orange, #f97316)" size={18} />
      }
    : isInfo
    ? {
        bg: 'var(--rm-blue-pale, #e8f0ff)',
        border: 'rgba(29, 114, 254, 0.3)',
        text: 'var(--rm-navy, #0f2057)',
        icon: <BsInfoCircleFill color="var(--rm-blue, #1d72fe)" size={18} />
      }
    : {
        bg: 'var(--rm-red-light, #ffe4e4)',
        border: 'rgba(239, 68, 68, 0.35)',
        text: '#7f1d1d',
        icon: <BsExclamationCircleFill color="var(--rm-red, #ef4444)" size={18} />
      };

  return (
    <div
      role="alert"
      className={`rm-error-alert ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        color: palette.text,
        fontSize: '0.84rem',
        lineHeight: 1.45,
        marginBottom: 16,
        position: 'relative',
        animation: 'rmFadeInDown 0.25s ease-out',
        boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
        ...style
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 2 }}>{palette.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{message}</div>
        {(actionText || actionLink) && (
          <div style={{ marginTop: 8 }}>
            {actionLink ? (
              <a
                href={actionLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: palette.text,
                  textDecoration: 'underline'
                }}
              >
                <span>{actionText || 'Resolve now'}</span>
                <BsArrowRight size={12} />
              </a>
            ) : (
              <button
                type="button"
                onClick={onAction}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: isWarning ? 'var(--rm-orange, #f97316)' : 'var(--rm-blue, #1d72fe)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                <span>{actionText}</span>
                <BsArrowRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Dismiss error"
          style={{
            background: 'none',
            border: 'none',
            color: palette.text,
            cursor: 'pointer',
            padding: 2,
            marginLeft: 4,
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            lineHeight: 1
          }}
        >
          <BsX />
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
