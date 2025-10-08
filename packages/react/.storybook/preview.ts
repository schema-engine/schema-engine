import type { Preview } from '@storybook/react-vite';
import '../src/stories/styles/global.css';
import '@json-form-engine/core/actions/debug-registry';
import '../src/registrations';

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