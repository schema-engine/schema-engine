import type { Preview } from '@storybook/react-vite';
import '../src/styles/global.css';
import '../src/registrations/default-shadcn';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;