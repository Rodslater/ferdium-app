// Takes the place of the webview for the IRC service. Halloy's native window is
// positioned by the main process over this element. A native child window is
// always drawn above the page, so it must be hidden whenever any HTML has to
// show on top of the services area: settings, modals, title bar menus.
import { ipcRenderer } from 'electron';
import { autorun } from 'mobx';
import { inject, observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import type ServiceModel from '../../models/Service';
import type { RealStores } from '../../stores';
import { state as basicAuthState } from '../basicAuth/store';
import { state as quickSwitchState } from '../quickSwitch/store';
import { HALLOY_IPC, type HalloyBounds } from './constants';

// electron-react-titlebar renders this element only while a menu is open.
const TITLE_BAR_MENU_SELECTOR = '#app-menu-foldout';

interface IProps {
  service: ServiceModel;
  stores?: RealStores;
}

const measure = (element: HTMLElement): HalloyBounds => {
  const rect = element.getBoundingClientRect();
  const scale = window.devicePixelRatio;
  return {
    x: Math.round(rect.left * scale),
    y: Math.round(rect.top * scale),
    width: Math.round(rect.width * scale),
    height: Math.round(rect.height * scale),
  };
};

const HalloyView = ({ service, stores }: IProps) => {
  const area = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setMenuOpen(document.querySelector(TITLE_BAR_MENU_SELECTOR) !== null),
    );
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // The div below is always rendered, so the ref is set when effects run.
    const element = area.current!;

    let shown = false;
    const sync = (): void => {
      const isVisible =
        service.isActive &&
        stores!.router.location.pathname === '/' &&
        !quickSwitchState.isModalVisible &&
        // isModalVisible starts as true; the modal only renders with authInfo.
        !(basicAuthState.isModalVisible && basicAuthState.authInfo) &&
        !isMenuOpen;
      if (isVisible) {
        ipcRenderer.send(HALLOY_IPC.show, measure(element));
        shown = true;
      } else if (shown) {
        ipcRenderer.send(HALLOY_IPC.hide);
        shown = false;
      }
    };

    const disposeAutorun = autorun(sync);
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(element);
    window.addEventListener('resize', sync);

    return () => {
      disposeAutorun();
      resizeObserver.disconnect();
      window.removeEventListener('resize', sync);
      if (shown) {
        ipcRenderer.send(HALLOY_IPC.hide);
      }
    };
  }, [service, stores, isMenuOpen]);

  return <div ref={area} style={{ width: '100%', height: '100%' }} />;
};

export default inject('stores')(observer(HalloyView));
