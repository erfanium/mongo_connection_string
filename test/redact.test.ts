import { assertEquals, describe, it } from "../test_deps.ts";

import { redactConnectionString } from "../connection_string.ts";

for (const protocol of ["mongodb", "mongodb+srv", "+invalid+"]) {
  describe(`when url contains credentials (protocol: ${protocol})`, () => {
    it("returns the <credentials> in output instead of password", () => {
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:catsc@tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin`,
        ),
        `${protocol}://<credentials>@cats-data-sets-e08dy.mongodb.net/admin`,
      );
    });

    it("returns the <credentials> keeping the username if desired", () => {
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:catsc@tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin`,
          { redactUsernames: false },
        ),
        `${protocol}://admin:<credentials>@cats-data-sets-e08dy.mongodb.net/admin`,
      );
    });

    it("returns the <credentials> in output instead of IAM session token", () => {
      assertEquals(
        redactConnectionString(
          `${protocol}://cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3Asampletoken,else%3Amiau&param=true`,
        ).replace(/%2C/g, ","),
        `${protocol}://cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3A<credentials>,else%3Amiau&param=true`,
      );
      assertEquals(
        redactConnectionString(
          `${protocol}://cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3Asampletoken&param=true`,
        ),
        `${protocol}://cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3A<credentials>&param=true`,
      );
      assertEquals(
        redactConnectionString(
          `${protocol}://cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3Asampletoken`,
        ),
        `${protocol}://cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3A<credentials>`,
      );
    });

    it("returns the <credentials> in output instead of password and IAM session token", () => {
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3Asampletoken&param=true`,
        ),
        `${protocol}://<credentials>@cats-data-sets-e08dy.mongodb.net/admin?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN%3A<credentials>&param=true`,
      );
    });

    it("returns the <credentials> in output instead of tlsCertificateKeyFilePassword", () => {
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin?tls=true&tlsCertificateKeyFilePassword=p4ssw0rd`,
        ),
        `${protocol}://<credentials>@cats-data-sets-e08dy.mongodb.net/admin?tls=true&tlsCertificateKeyFilePassword=<credentials>`,
      );
    });

    it("returns the <credentials> in output instead of proxyPassword and proxyUsername", () => {
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=foo&proxyPassword=bar&param=true`,
        ),
        `${protocol}://<credentials>@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=<credentials>&proxyPassword=<credentials>&param=true`,
      );
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=foo&proxyPassword=bar`,
        ),
        `${protocol}://<credentials>@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=<credentials>&proxyPassword=<credentials>`,
      );
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=foo&proxyPassword=bar`,
          { redactUsernames: false },
        ),
        `${protocol}://admin:<credentials>@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=foo&proxyPassword=<credentials>`,
      );
      assertEquals(
        redactConnectionString(
          `${protocol}://admin:tscat3ca1s@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=foo&proxyPassword=bar`,
          { replacementString: "****" },
        ),
        `${protocol}://****@cats-data-sets-e08dy.mongodb.net/admin?proxyUsername=****&proxyPassword=****`,
      );
    });
  });

  it("does not alter input when url contains no credentials", () => {
    assertEquals(
      redactConnectionString(`${protocol}://127.0.0.1:27017/`),
      `${protocol}://127.0.0.1:27017/`,
    );
    assertEquals(
      redactConnectionString(
        `${protocol}://127.0.0.1:27017/?authMechanismProperties=IGNORE:ME`,
      ),
      `${protocol}://127.0.0.1:27017/?authMechanismProperties=IGNORE:ME`,
    );
  });
}
