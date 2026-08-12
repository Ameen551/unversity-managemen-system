export function getPagination(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
export function paginate(items, total, params) {
    return {
        items,
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize) || 1,
    };
}
