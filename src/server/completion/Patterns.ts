export const typePattern = /^\s*?type \s*?"(\w+)"?.*$/gm;
export const propertyPositionPattern = /^.*?data.*?"/m;
export const valuePositionPattern = /^.*?data.*?".*?".*?"/m;
export const getPropertyPattern = /^.*?data.*?"(\w+)"?/m;
export const getAllPropertiesPattern = /.*?data.*?"(\w+).*?$/gm;

export function isNullOrWhitespace( input:string ) : boolean {
	if (typeof input === 'undefined' || input == null) return true;
	return input.replace(/\s/g, '').length< 1;
}