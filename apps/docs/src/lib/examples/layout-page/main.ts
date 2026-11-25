import { renderToStaticMarkup } from 'react-dom/server';
import { renderPage } from './host.react';
import { dashboard } from './page';

console.log(renderToStaticMarkup(renderPage(dashboard)));
