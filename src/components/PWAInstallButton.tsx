import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'card' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'card'
            ? 'w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 active:scale-[0.98] transition-all whitespace-nowrap shrink-0'
            : 'min-h-[40px] flex items-center gap-1.5 rounded-lg bg-control border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-control-hover transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>安装到桌面</span>
      </button>
    );
  }

  if (variant === 'card' || isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={
            variant === 'card'
              ? 'w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-control border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-control-hover transition-colors whitespace-nowrap shrink-0'
              : 'min-h-[40px] flex items-center gap-1.5 rounded-lg border border-white/10 bg-raised px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap shrink-0'
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Android / iOS 安装</span>
        </button>

        {showGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <div className="w-full max-w-sm rounded-2xl bg-surface border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <h3 id="pwa-install-title" className="text-base font-semibold text-gray-100">
                  安装为独立手机应用
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="关闭安装引导"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-300 leading-relaxed">
                {isIOS ? (
                  <>
                    <p>1. 点击 Safari 浏览器底部的「分享」按钮。</p>
                    <p>2. 向下滑动并选择「添加到主屏幕」。</p>
                    <p>3. 添加后即可全屏离线使用吉他调音器。</p>
                  </>
                ) : (
                  <>
                    <p>1. 在 Android Chrome 或 Edge 浏览器中打开本页面。</p>
                    <p>2. 点击右上角菜单「⋮」，选择「安装应用」或「添加到主屏幕」。</p>
                    <p>3. 安装后可像原生 Android 应用一样全屏运行并支持离线调音。</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
