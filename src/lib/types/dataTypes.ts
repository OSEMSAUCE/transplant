export type RepositoryType = {
	id: number;
	name: string;
	link: string;
	type: string;
    size: number | null;
	blurb: string;
	tagIds: number[];
};

export type TagType = {
	id: number;
	name: string;
};
export * from './dataTypes';

// const unusedVariable = 'This should trigger a linting error';