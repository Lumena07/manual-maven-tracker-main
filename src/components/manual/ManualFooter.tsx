import React from 'react';

interface ManualFooterProps {
  isPrintMode?: boolean;
}

export function ManualFooter({ isPrintMode = false }: ManualFooterProps) {
  // If in print mode, don't render the footer
  if (isPrintMode) {
    return null;
  }

  return (
    <div className="manual-footer">
      <div className="footer-separator"></div>
      <div className="footer-text">NOT CONTROLLED ONCE PRINTED</div>
      
      <style>
        {`
          .manual-footer {
            width: 100%;
            margin-top: 20px;
            text-align: center;
          }
          .footer-separator {
            height: 1px;
            background-color: #ccc;
            margin-bottom: 10px;
          }
          .footer-text {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: #666;
          }
          @media print {
            .manual-footer {
              display: none;
            }
          }
        `}
      </style>
    </div>
  );
} 