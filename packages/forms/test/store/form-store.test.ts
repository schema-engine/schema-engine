import { formStoreConformance } from '../../../../test-utils/form-store-conformance';
import { createFormStateContainer } from '@/store/create-form-state-container';

formStoreConformance(createFormStateContainer);
