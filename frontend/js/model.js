import 'whatwg-fetch';
import {
    bindAll as _bindAll,
    cloneDeep as _cloneDeep,
    forEach as _forEach,
    find as _find,
    findIndex as _findIndex,
    remove as _remove
} from 'lodash-es';

import { API_ROOT } from './config';


export default class CommentsModel {
    constructor(root_el) {
        this.root_el = document.querySelector(root_el);

        // comments state
        this.state = {
            owner_id: 1,
            comments: [],
            offset: 0,
            hasMore: true
        }
        this.prevState = {}

        _bindAll(this, [
            'setState',
            'renderComments',
            'fetchComments',
            'sendComment',
            'removeComment',
            'editComment',
            'afterRender',
            'beforeRemove',
            'showReply',
            '_handleDelete',
            '_handleEdit',
            '_handleReply'
        ]);
    }

    // this method updates state
    setState(newState) {
        this.prevState = _cloneDeep(this.state);

        if (newState.comments && newState.comments.length) {
            this.state.comments = this.state.comments.concat(newState.comments);
        }
        if (newState.offset && newState.offset >= 0) {
            this.state.offset = newState.offset;
        }
        if (newState.hasMore) {
            this.state.hasMore = newState.hasMore;
        }
    }

    // main render method
    // it renders comments from the state
    renderComments() {
        this.beforeRemove();

        while (this.root_el.firstChild) {
            this.root_el.removeChild(this.root_el.firstChild);
        }

        _forEach(this.state.comments, comment => {
            const comment_datetime = new Date(
                comment.updated_at ? comment.updated_at : comment.created_at
            );
            const comment_date = moment(comment_datetime).format('YYYY-MM-DD');
            const comment_time = moment(comment_datetime).format('HH:mm');

            const comment_el = document.createElement('article');
            comment_el.className = 'comments-list__comment comment';
            comment_el.setAttribute('data-id', comment.id);

            const owner_buttons = comment.author.id === this.state.owner_id ? `
<div class="comment-footer__section">
    <button type="button" class="comment-footer__btn btn-edit" data-id="${ comment.id }" data-parent="${ null }">
        <i class="fa fa-pencil-square-o" aria-hidden="true"></i> Edit
    </button>
</div>
<div class="comment-footer__section">
    <button type="button" class="comment-footer__btn btn-delete" data-id="${ comment.id }" data-parent="${ null }">
        <i class="fa fa-times" aria-hidden="true"></i> Delete
    </button>
</div>
            ` : '';

            comment_el.innerHTML = `
<figure class="comment-avatar comment__avatar">
    <img src="${ comment.author.avatar }" alt="" class="comment-avatar__img">
</figure>
<div class="comment__wrapper">
    <header class="comment__header comment-header">
        <p class="comment-header__author">${ comment.author.name }</p>
        <p class="comment-header__posted-date">
            <i class="fa fa-clock-o" aria-hidden="true"></i>
            <b>${ comment_date }</b> at <b>${ comment_time }</b>
        </p>
    </header>
    <div class="comment__body comment-body">
        <p>${ comment.content }</p>
    </div>
    <footer class="comment__footer comment-footer">
        ${ owner_buttons }
        <div class="comment-footer__section">
            <button type="button" class="comment-footer__btn btn-reply" data-id="${ comment.id }" data-name="${ comment.author.name }">
                <i class="fa fa-reply" aria-hidden="true"></i> Reply
            </button>
        </div>
    </footer>
</div>
            `;

            this.root_el.appendChild(comment_el);

            if (comment.children && comment.children.length) {
                const nested_root = document.createElement('div');
                nested_root.className = 'comment__nested-comments';

                this.root_el.querySelector(`[data-id="${ comment.id }"] .comment__wrapper`).appendChild(nested_root);

                _forEach(comment.children, child => {
                    const comment_datetime = new Date(
                        child.updated_at ? child.updated_at : child.created_at
                    );
                    const comment_date = moment(comment_datetime).format('YYYY-MM-DD');
                    const comment_time = moment(comment_datetime).format('HH:mm');

                    const comment_el = document.createElement('article');
                    comment_el.className = 'comments-list__comment comments-list__comment_nested comment';
                    comment_el.setAttribute('data-id', child.id);

                    const owner_buttons = child.author.id === this.state.owner_id ? `
<div class="comment-footer__section">
    <button type="button" class="comment-footer__btn btn-edit" data-id="${ child.id }" data-parent="${ comment.id }">
        <i class="fa fa-pencil-square-o" aria-hidden="true"></i> Edit
    </button>
</div>
<div class="comment-footer__section">
    <button type="button" class="comment-footer__btn btn-delete" data-id="${ child.id }" data-parent="${ comment.id }">
        <i class="fa fa-times" aria-hidden="true"></i> Delete
    </button>
</div>
                    ` : '';

                    comment_el.innerHTML = `
<figure class="comment-avatar comment-avatar_nested comment__avatar">
    <img src="${ child.author.avatar }" alt="" class="comment-avatar__img">
</figure>
<div class="comment__wrapper">
    <header class="comment__header comment-header">
        <p class="comment-header__author">${ child.author.name }</p>
        <p class="comment-header__reply">
            <i class="fa fa-reply" aria-hidden="true"></i>
            ${ comment.author.name }
        </p>
        <p class="comment-header__posted-date">
            <i class="fa fa-clock-o" aria-hidden="true"></i>
            <b>${ comment_date }</b> at <b>${ comment_time }</b>
        </p>
    </header>
    <div class="comment__body comment-body">
        <p>${ child.content }</p>
    </div>
    <footer class="comment__footer comment-footer">
        ${ owner_buttons }
    </footer>
</div>
                    `;

                    nested_root.appendChild(comment_el);
                });
            }
        });


        this.afterRender();
    }

    // doing stuff after render
    // binding actions, etc
    afterRender() {
        const delete_btns = document.querySelectorAll('.btn-delete');
        _forEach(delete_btns, btn => {
            btn.addEventListener('click', this._handleDelete);
        });

        const edit_btns = document.querySelectorAll('.btn-edit');
        _forEach(edit_btns, btn => {
            btn.addEventListener('click', this._handleEdit);
        });

        const reply_btns = document.querySelectorAll('.btn-reply');
        _forEach(reply_btns, btn => {
            btn.addEventListener('click', this._handleReply);
        });
    }

    // doing stuff before remove comments
    beforeRemove() {
        const delete_btns = document.querySelectorAll('.btn-delete');
        _forEach(delete_btns, btn => {
            btn.removeEventListener('click', this._handleDelete);
        });

        const edit_btns = document.querySelectorAll('.btn-edit');
        _forEach(edit_btns, btn => {
            btn.removeEventListener('click', this._handleEdit);
        });

        const reply_btns = document.querySelectorAll('.btn-reply');
        _forEach(reply_btns, btn => {
            btn.removeEventListener('click', this._handleReply);
        });
    }

    // handler for delete buttons
    _handleDelete(e) {
        this.removeComment(e.target.getAttribute('data-id'), e.target.getAttribute('data-parent'));
    }

    // handler for edit buttons
    _handleEdit(e) {
        const target = e.target
        const comment_id = +target.getAttribute('data-id');
        const parent_id = +target.getAttribute('data-parent');

        let content = '';
        if (parent_id && parent_id != 'null') {
            const idx = _findIndex(this.state.comments, comment => comment.id == parent_id);
            content = _find(this.state.comments[idx].children, comment => comment.id == comment_id).content;
        } else {
            content = _find(this.state.comments, ['id', comment_id]).content;
        }


        this.showReply(target, content, parent_id);
    }

    // handler for reply buttons
    _handleReply(e) {
        this.showReply(e.target);
    }

    // method for showing form for reply or edit
    showReply(btn, content = '', parent = null) {
        const comment_wrapper = btn.parentNode.parentNode.parentNode;
        const nested = comment_wrapper.querySelector('.comment__nested-comments');

        const reply_to_name = btn.getAttribute('data-name');
        const reply_to_id = btn.getAttribute('data-id');
        const parent_id = btn.getAttribute('data-parent');

        const form_reply_to = !content ? `
<p class="reply-info__to">
    <i class="fa fa-reply" aria-hidden="true"></i>
    ${ reply_to_name }
</p>
        ` : '';
        const form_type = content ? 'edit' : 'reply';

        const reply_form = document.createElement('div');
        reply_form.className = 'comment__reply comment-reply';
        reply_form.innerHTML = `
<div class="comment-reply__info reply-info">
    ${ form_reply_to }
    <button type="button" class="reply-info__cancel">
        <i class="fa fa-times" aria-hidden="true"></i> Cancel
    </button>
</div>
<form action="#" class="comment-reply__form comment-form" data-id="${ reply_to_id }" data-parent=${ parent_id } data-type="${ form_type }">
    <textarea name="comment" rows="4" placeholder="Your  Message" class="comment-form__textarea textarea">${ content }</textarea>
    <button type="submit" class="btn btn_send comment-form__btn">Send</button>
</form>
        `;

        this.removeReply();

        if (nested) {
            comment_wrapper.insertBefore(reply_form, nested);
        } else {
            comment_wrapper.appendChild(reply_form);
        }

        comment_wrapper.querySelector('.reply-info__cancel').addEventListener('click', () => {
            this.removeReply();
        });

        comment_wrapper.querySelector('.comment-reply__form').addEventListener('submit', (e) => {
            e.preventDefault();
            let textarea = e.target.querySelector('.textarea');

            if (textarea.value) {
                switch (e.target.getAttribute('data-type')) {
                    case 'edit':
                        this.editComment(textarea.value, e.target.getAttribute('data-id'), e.target.getAttribute('data-parent'));
                        break;
                    default:
                        this.sendComment(textarea.value, e.target.getAttribute('data-id'));
                }
                // textarea.value = '';
                this.removeReply();
            }
        });
    }

    // mmethod that removes reply forms
    removeReply() {
        _forEach(document.querySelectorAll('.comment-reply'), form => {
            form.remove();
        });
    }

    // method for getting comments from API
    fetchComments(count = 5) {
        if (this.state.hasMore) {
            const query = `${ API_ROOT }/comments?offset=${ this.state.offset }&count=${ count }`;

            fetch(query)
                .then(response => response.json())
                .then(response => {
                    this.setState({
                        comments: response,
                        offset: this.state.offset + count,
                        hasMore: response.length >= 5
                    });

                    this.renderComments();
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }

    // method for posting comment
    sendComment(content, parent = null) {
        const query = `${ API_ROOT }/comments`;

        fetch(query, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                parent: parent
            }) })
            .then(response => response.json())
            .then(response => {
                if (parent && parent != 'null') {
                    const idx = _findIndex(this.state.comments, comment => comment.id == parent);
                    this.state.comments[idx].children.unshift(response);
                } else {
                    const new_length = this.state.comments.unshift(response);

                    this.setState({
                        offset: this.state.offset + 1
                    });
                }

                this.renderComments();
            })
            .catch(e => {
                console.error(e);
            });
    }

    // method for removing comment
    removeComment(id, parent) {
        const query = `${ API_ROOT }/comments/${ id }`;

        fetch(query, {
            method: 'DELETE'
            })
            .then(() => {
                if (parent && parent != 'null') {
                    const idx = _findIndex(this.state.comments, comment => comment.id == parent);
                    this.state.comments[idx].children = _remove(this.state.comments[idx].children, comment => comment.id != id)
                } else {
                    this.state.comments = _remove(this.state.comments, comment => comment.id != id)

                    this.setState({
                        offset: this.state.offset - 1
                    });
                }

                this.renderComments();
            })
            .catch(e => {
                console.error(e);
            });
    }

    // method for edit comment
    editComment(content, id, parent) {
        console.log(content, id, parent);

        const query = `${ API_ROOT }/comments/${ id }`;

        fetch(query, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            }) })
            .then(() => {
                if (parent && parent != 'null') {
                    const parent_idx = _findIndex(this.state.comments, comment => comment.id == parent);
                    const idx = _findIndex(this.state.comments[parent_idx].children, comment => comment.id == id);
                    this.state.comments[parent_idx].children[idx].content = content;
                } else {
                    const idx = _findIndex(this.state.comments, comment => comment.id == id);
                    this.state.comments[idx].content = content;
                }

                this.renderComments();
            })
            .catch(e => {
                console.error(e);
            });
    }
}
