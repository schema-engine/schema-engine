import { formStoreConformance } from '../../../../test-utils/form-store-conformance';
import { createFormStore } from '@/store/create-form-store';

formStoreConformance(createFormStore);
