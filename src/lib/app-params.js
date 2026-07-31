const isNode = typeof window === 'undefined';
const memoryStorage = new Map();
const nodeStorage = {
	setItem: (key, value) => memoryStorage.set(key, String(value)),
	getItem: (key) => memoryStorage.get(key) || null,
	removeItem: (key) => memoryStorage.delete(key),
};
const windowObj = isNode ? { localStorage: nodeStorage } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, {
	defaultValue = undefined,
	removeFromUrl = false,
	persist = true,
	useStored = true,
} = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		if (persist) {
			storage.setItem(storageKey, searchParam);
		}
		return searchParam;
	}
	if (defaultValue) {
		if (persist) {
			storage.setItem(storageKey, defaultValue);
		}
		return defaultValue;
	}
	const storedValue = useStored ? storage.getItem(storageKey) : null;
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	// Base44 may add this one-shot flag while changing preview/auth context.
	// It must never be persisted: a persisted flag clears the shared token on
	// every later navigation, including a link opened in a new browser tab.
	const clearAccessToken = getAppParamValue("clear_access_token", {
		removeFromUrl: true,
		persist: false,
		useStored: false,
	});
	storage.removeItem('base44_clear_access_token');
	if (clearAccessToken === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		// Preview URLs may pin a backend version, but that pin must never leak
		// into the published app through localStorage.
		functionsVersion: getAppParamValue("functions_version", {
			defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
			persist: false,
			useStored: false,
		}),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}
