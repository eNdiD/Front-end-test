import CommentsModel from './model';


document.addEventListener('DOMContentLoaded', () => {

    const comments = new CommentsModel('.comments-list');

    // Загрузка коментариев
    comments.fetchComments(5);

    const load_more_btn = document.querySelector('.load-more__btn');
    load_more_btn.addEventListener('click', () => {
        comments.fetchComments(5);
    });

    const leave_comment_form = document.querySelector('.leave-comment__form');
    leave_comment_form.addEventListener('submit', (e) => {
        e.preventDefault();
        let textarea = e.target.querySelector('.textarea');

        if (textarea.value) {
            comments.sendComment(textarea.value);
            textarea.value = '';
        }
    });
});
