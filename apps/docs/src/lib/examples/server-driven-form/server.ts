export const signupForm = {
	id: 'signup',
	title: 'Create your account',
	steps: [
		{
			id: 'account',
			title: 'Create your account',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Enter your email' },
						{ $type: 'email', message: 'Enter a valid email address' },
					],
				},
				{
					$type: 'input',
					id: 'username',
					name: 'username',
					label: 'Username',
					rules: [
						{ $type: 'required', message: 'Choose a username' },
						{ $type: 'minLength', value: 3, message: 'Use at least 3 characters' },
					],
				},
				{
					$type: 'select',
					id: 'plan',
					name: 'plan',
					label: 'Plan',
					placeholder: 'Choose a plan',
					options: [
						{ value: 'free', label: 'Free' },
						{ value: 'team', label: 'Team' },
					],
					rules: [{ $type: 'required', message: 'Choose a plan' }],
				},
				{ $type: 'submit', id: 'create', name: 'create', label: 'Create account' },
			],
		},
	],
	actions: [
		{
			id: 'created',
			$type: 'show_notification',
			message: 'Account created.',
			variant: 'success',
			triggers: ['form_submit_success'],
		},
	],
};

/**
 * The form of a newer release: it asks for a rating with an element this client has not registered.
 *
 * @remarks
 * It is what a client sees when the server ships ahead of it.
 */
const nextForm = {
	...signupForm,
	steps: [
		{
			...signupForm.steps[0],
			elements: [...signupForm.steps[0]!.elements, { $type: 'rating', id: 'stars', name: 'stars', max: 5 }],
		},
	],
};

/** The route handler of `/forms/signup`: it answers with the form config as JSON. `?next` asks for the next release's. */
export function GET(request: Request): Response {
	return Response.json(new URL(request.url).searchParams.has('next') ? nextForm : signupForm);
}

/**
 * The route handler of `/api/signups`: it creates the account, or answers 422 with Problem Details when the
 * username is taken.
 */
export async function POST(request: Request): Promise<Response> {
	const { username } = (await request.json()) as { username?: string };
	if (username === 'ada') {
		return Response.json(
			{
				type: 'https://example.com/problems/validation',
				title: 'Validation failed',
				status: 422,
				errors: [{ pointer: '#/username', code: 'taken', detail: 'That username is already taken' }],
			},
			{ status: 422 },
		);
	}
	return Response.json({ created: true }, { status: 201 });
}
