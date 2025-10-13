import { BounceLoader } from 'react-spinners';

export default function Loader({ 
  size = 60, 
  color = '#179349', 
  loading = true, 
  fullScreen = false,
  containerOnly = true,
  message = 'Chargement...' 
}) {
  if (!loading) return null;

  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-content">
          <BounceLoader color={color} size={size} loading={loading} />
          {message && <p className="loader-message">{message}</p>}
        </div>

        <style jsx>{`
          .loader-fullscreen {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            width: 100%;
            background: rgba(255, 255, 255, 0.95);
            position: fixed;
            top: 0;
            left: 0;
            z-index: 9999;
          }

          .loader-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }

          .loader-message {
            color: #179349;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            animation: pulse 1.5s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          /* Mode dark */
          :global(.themed:not(.light)) .loader-fullscreen {
            background: rgba(30, 30, 30, 0.95);
          }

          :global(.themed:not(.light)) .loader-message {
            color: #1db558;
          }
        `}</style>
      </div>
    );
  }

  if (containerOnly) {
    return (
      <div className="loader-container">
        <div className="loader-content">
          <BounceLoader color={color} size={size} loading={loading} />
          {message && <p className="loader-message">{message}</p>}
        </div>

        <style jsx>{`
          .loader-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 90vh;
            width: 100%;
            background: rgba(255, 255, 255, 0.9);
            padding: 50px 20px;
          }

          .loader-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }

          .loader-message {
            color: #179349;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            animation: pulse 1.5s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          /* Mode dark */
          :global(.themed:not(.light)) .loader-container {
            background: rgba(30, 30, 30, 0.9);
          }

          :global(.themed:not(.light)) .loader-message {
            color: #1db558;
          }
        `}</style>
      </div>
    );
  }

  // Mode inline (non plein écran)
  return (
    <div className="loader-inline">
      <BounceLoader color={color} size={size} loading={loading} />
      {message && <p className="loader-message-inline">{message}</p>}

      <style jsx>{`
        .loader-inline {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          padding: 30px;
        }

        .loader-message-inline {
          color: #179349;
          font-size: 16px;
          font-weight: 500;
          margin: 0;
        }

        :global(.themed:not(.light)) .loader-message-inline {
          color: #1db558;
        }
      `}</style>
    </div>
  );
}

