import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { submitFormHandler } from "../src/stories/msw/submit-form";
import "../src/styles/global.css";
import "../src/registrations/default-shadcn";

initialize({
	onUnhandledRequest: "bypass",
});

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
    msw:{
			handlers: [submitFormHandler],
    },
	},
	loaders: [mswLoader],
};

export default preview;
