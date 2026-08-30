/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, CheckCircle2, Clock, Send, ShieldCheck } from 'lucide-react';
import { ProOrderEmailLog, PRINCIPAL_EMAIL } from '../types';

interface EmailViewerModalProps {
  email: ProOrderEmailLog | null;
  onClose: () => void;
}

export const EmailViewerModal: React.FC<EmailViewerModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#090D16] border border-amber-500/30 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between p-4 bg-[#0D1322] border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                  Dispatch Mail Record
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Sent via {PRINCIPAL_EMAIL}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {email.type === 'CONFIRMATION' ? 'Step 1: Instant Confirmation Email' : 'Step 3: Polished PDF Delivery Email'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Email Headers Meta Box */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-2 text-xs font-mono text-slate-300 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">From:</span>
              <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Crypto Review Lab &lt;{email.from}&gt;
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">To Client:</span>
              <span className="text-sky-300 font-semibold">{email.to}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Subject:</span>
              <span className="text-slate-100 font-bold">{email.subject}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Sent Timestamp:
              </span>
              <span>{new Date(email.sentAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Render HTML Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B0F19]">
            {email.fullHtmlContent ? (
              <div 
                className="email-rendered-container shadow-2xl rounded-xl overflow-hidden"
                dangerouslySetInnerHTML={{ __html: email.fullHtmlContent }}
              />
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs">
                {email.bodyPreview}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-[#0D1322] border-t border-slate-800 flex justify-between items-center shrink-0 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Send className="w-3.5 h-3.5 text-amber-400" />
              Verified Dispatch Service: {PRINCIPAL_EMAIL}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer font-sans text-xs font-semibold"
            >
              Close Record
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
