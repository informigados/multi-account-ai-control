type NoteModel = {
	id: string;
	accountId: string;
	noteType: string;
	content: string;
	createdBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	author?: {
		id: string;
		username: string;
		email: string;
	} | null;
};

export function presentNote(note: NoteModel) {
	return {
		id: note.id,
		accountId: note.accountId,
		noteType: note.noteType,
		content: note.content,
		createdBy: note.createdBy,
		createdAt: note.createdAt.toISOString(),
		updatedAt: note.updatedAt.toISOString(),
		author: note.author
			? {
					id: note.author.id,
					username: note.author.username,
					email: note.author.email,
				}
			: null,
	};
}
