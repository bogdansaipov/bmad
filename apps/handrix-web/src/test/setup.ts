import * as matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

expect.extend(matchers)

import.meta.env.VITE_API_BASE_URL ??= 'http://localhost:3000'
import.meta.env.VITE_HANDRIX_ENV ??= 'development'
