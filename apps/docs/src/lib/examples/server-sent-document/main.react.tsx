/** @jsxImportSource react */
import { createRoot } from 'react-dom/client';
import { routeFetchToLocalServer } from './local-network.helper';
import { ServerDocument } from './server-document.react';

routeFetchToLocalServer();

export const root = createRoot(document.getElementById('root')!);
root.render(<ServerDocument url="https://shop.example/orders/1042" />);
