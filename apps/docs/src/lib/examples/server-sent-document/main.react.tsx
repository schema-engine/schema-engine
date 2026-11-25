/** @jsxImportSource react */
import { createRoot } from 'react-dom/client';
import { useLocalServer } from './local-network.helper';
import { ServerDocument } from './server-document.react';

useLocalServer();

createRoot(document.getElementById('root')!).render(<ServerDocument url="https://shop.example/orders/1042" />);
