import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createMockBase44Client } from '@/lib/mockBase44';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

let realClient = null;
if (appId) {
  try {
    realClient = createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      appBaseUrl,
    });
  } catch (err) {
    console.warn('Could not initialize Base44 SDK client, using local mock store:', err);
  }
}

const mockClient = createMockBase44Client();

function createResilientProxy(targetMock, targetReal) {
  if (!targetReal) return targetMock;

  return new Proxy(targetReal, {
    get(obj, prop) {
      const realVal = obj[prop];
      const mockVal = targetMock?.[prop];

      if (typeof realVal === 'function') {
        return async function (...args) {
          try {
            return await realVal.apply(obj, args);
          } catch (err) {
            console.warn(`Base44 operation '${String(prop)}' failed, falling back to local store:`, err);
            if (typeof mockVal === 'function') {
              return await mockVal.apply(targetMock, args);
            }
            throw err;
          }
        };
      }

      if (realVal && typeof realVal === 'object') {
        return createResilientProxy(mockVal || {}, realVal);
      }

      return realVal !== undefined ? realVal : mockVal;
    },
  });
}

export const base44 = createResilientProxy(mockClient, realClient);
