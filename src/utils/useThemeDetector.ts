import { useState, useEffect } from 'react';

export const useThemeDetector = (): boolean => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const html = document.documentElement;
              return html.getAttribute('dark') === 'true' || 
                     html.hasAttribute('dark') ||
                     document.body.classList.contains('dark-theme');
            },
          });
          setIsDark(result);
        }
      } catch (error) {
        console.error('Error detecting theme:', error);
        setIsDark(false);
      }
    };

    checkTheme();
  }, []);

  return isDark;
}; 