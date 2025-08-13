describe('Password Reset Callback', () => {
  it('updates password and shows success message with login link', () => {
    cy.intercept('PUT', '**/auth/v1/user', {
      statusCode: 200,
      body: {},
    }).as('updateUser');

    cy.intercept('POST', '**/auth/v1/logout', {
      statusCode: 200,
      body: {},
    }).as('logout');

    cy.visit('/auth/callback');

    cy.get('input[type="password"]').eq(0).type('newpassword');
    cy.get('input[type="password"]').eq(1).type('newpassword');
    cy.get('button[type="submit"]').click();

    cy.wait('@updateUser');
    cy.contains('パスワードを更新しました').should('be.visible');
    cy.get('a[href="/login"]').should('be.visible');
  });
});
