// deno-lint-ignore-file no-explicit-any
import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  describe,
  it,
} from "../test_deps.ts";

import {
  CommaAndColonSeparatedRecord,
  ConnectionString,
} from "../connection_string.ts";

describe("ConnectionString with valid URIs", () => {
  for (
    const { uri, match } of [
      {
        uri: "mongodb://localhost/",
        match: {
          href: "mongodb://localhost/",
          protocol: "mongodb:",
          username: "",
          password: "",
          pathname: "/",
          search: "",
          hash: "",
          isSRV: false,
          hosts: ["localhost"],
        },
      },
      {
        uri: "mongodb+srv://localhost",
        match: {
          href: "mongodb+srv://localhost/",
          protocol: "mongodb+srv:",
          username: "",
          password: "",
          pathname: "/",
          search: "",
          hash: "",
          isSRV: true,
          hosts: ["localhost"],
        },
      },
      {
        uri: "mongodb+srv://cat:meow@localhost/",
        match: {
          href: "mongodb+srv://cat:meow@localhost/",
          protocol: "mongodb+srv:",
          username: "cat",
          password: "meow",
          pathname: "/",
          search: "",
          hash: "",
          isSRV: true,
          hosts: ["localhost"],
        },
      },
      {
        uri: "mongodb://cat:meow@localhost:12345/db",
        match: {
          href: "mongodb://cat:meow@localhost:12345/db",
          protocol: "mongodb:",
          username: "cat",
          password: "meow",
          pathname: "/db",
          search: "",
          hash: "",
          isSRV: false,
          hosts: ["localhost:12345"],
        },
      },
      {
        uri: "mongodb://localhost:12345,anotherHost/?directConnection=true",
        match: {
          href: "mongodb://localhost:12345,anotherHost/?directConnection=true",
          protocol: "mongodb:",
          username: "",
          password: "",
          pathname: "/",
          search: "?directConnection=true",
          hash: "",
          isSRV: false,
          hosts: ["localhost:12345", "anotherHost"],
        },
      },
    ]
  ) {
    it(`parses ${uri} correctly`, () => {
      const cs = new ConnectionString(uri);
      for (
        const key of Object.keys(
          match,
        ) as (keyof typeof cs & keyof typeof match)[]
      ) {
        assertEquals(cs[key], match[key]);
      }
    });
  }

  it("throws an error mentioning the invalid schema", () => {
    try {
      // eslint-disable-next-line no-new
      new ConnectionString("totallynotamongodb://outerspace");
    } catch (err) {
      assertEquals(
        (err as Error).message,
        'Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"',
      );
      assertEquals((err as Error).name, "MongoParseError");
      return;
    }
    throw new Error("missed exception");
  });

  for (
    const uri of [
      "",
      "//",
      "//@/",
      "mongodb://",
      "mongodb://@localhost/",
      "mongodb://:@localhost/",
      "mongodb://:pass@localhost/",
      "mongodb://%a@localhost/",
      "mongodb://:%a@localhost/",
      "mongodb://a[@localhost/",
      "mongodb://a:[@localhost/",
      "mongodb+srv://a,b,c/",
      "mongodb+srv://a:12345/",
      "mongodbabc://localhost",
      "totallynotamongodb://localhost",
      "mongodb+srv://Y:X@",
    ]
  ) {
    it(`parsing ${uri} throws an MongoParseError with invalid URIs`, () => {
      try {
        // eslint-disable-next-line no-new
        new ConnectionString(uri);
      } catch (err) {
        assertEquals((err as Error).name, "MongoParseError");
        return;
      }
      throw new Error("missed exception");
    });
  }

  it("allows changing hosts after modifications", () => {
    const cs = new ConnectionString("mongodb://localhost");
    assertEquals(cs.hosts, ["localhost"]);

    cs.hosts.push("localhost2");
    assertEquals(cs.hosts, ["localhost", "localhost2"]);
    assertEquals(cs.toString(), "mongodb://localhost,localhost2/");

    cs.hosts = ["a", "b", "c"];
    assertEquals(cs.hosts, ["a", "b", "c"]);
    assertEquals(cs.toString(), "mongodb://a,b,c/");
  });

  it("performs case-insensitive matches on connection options after modifications", () => {
    const cs = new ConnectionString(
      "mongodb://localhost/?SERVERSELECTIONTIMEOUTMS=100",
    );
    cs.searchParams.set("serverSelectionTimeoutMS", "200");
    cs.searchParams.append("serverSelectionTimeoutMS", "300");

    assertEquals(
      cs.toString(),
      "mongodb://localhost/?SERVERSELECTIONTIMEOUTMS=200&SERVERSELECTIONTIMEOUTMS=300",
    );
    assertEquals(cs.searchParams.has("serverSelectionTimeoutMS"), true);
    assertEquals(cs.searchParams.has("SERVERSELECTIONTIMEOUTMS"), true);
    assertEquals(cs.searchParams.get("serverSelectionTimeoutMS"), "200");
    assertEquals(cs.searchParams.getAll("serverSelectionTimeoutMS"), [
      "200",
      "300",
    ]);

    cs.searchParams.delete("serverSelectionTimeoutMS");
    assertEquals(cs.searchParams.has("serverSelectionTimeoutMS"), false);
    assertEquals(cs.searchParams.has("SERVERSELECTIONTIMEOUTMS"), false);
  });

  it("can make copies of ConnectionString instances", () => {
    const cs = new ConnectionString("mongodb://localhost");
    assertEquals(cs.toString(), "mongodb://localhost/");
    assertEquals(cs.clone().toString(), "mongodb://localhost/");
  });

  it("URL methods that do not apply to connection strings as-is", () => {
    const cs: any = new ConnectionString("mongodb://localhost");
    assertNotEquals(cs.host, "localhost");
    assertNotEquals(cs.hostname, "localhost");
    assertEquals(cs.port, "");
    assertEquals(cs.href, "mongodb://localhost/");
    assertThrows(() => {
      cs.host = "abc";
    }, Error);
    assertThrows(() => {
      cs.hostname = "abc";
    }, Error);
    assertThrows(() => {
      cs.port = "1000";
    }, Error);
    assertThrows(() => {
      cs.href = "mongodb://localhost";
    }, Error);
  });

  it("allows odd connection strings with loose validation", () => {
    const cs: any = new ConnectionString("mongodb://:password@x", {
      looseValidation: true,
    });
    assertEquals(cs.username, "");
    assertEquals(cs.password, "password");
    assertEquals(cs.port, "");
    assertEquals(cs.href, "mongodb://:password@x/");
  });

  it("throws good error messages for invalid URLs with loose validation", () => {
    try {
      // eslint-disable-next-line no-new
      new ConnectionString("-://:password@x", { looseValidation: true });
      throw new Error("missed exception");
    } catch (err: any) {
      assertEquals(
        err.message,
        'Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"',
      );
    }
  });
});

describe("CommaAndColonSeparatedRecord", () => {
  it("creates an empty map for empty input", () => {
    assertEquals(new CommaAndColonSeparatedRecord("").size, 0);
    assertEquals(new CommaAndColonSeparatedRecord().size, 0);
    assertEquals(new CommaAndColonSeparatedRecord(null).size, 0);
    assertEquals(new CommaAndColonSeparatedRecord(undefined).size, 0);
  });

  it("returns an empty string for empty input", () => {
    assertEquals(new CommaAndColonSeparatedRecord("").toString(), "");
    assertEquals(new CommaAndColonSeparatedRecord().toString(), "");
    assertEquals(new CommaAndColonSeparatedRecord(null).toString(), "");
    assertEquals(new CommaAndColonSeparatedRecord(undefined).toString(), "");
  });

  it("allows getting entries", () => {
    const record = new CommaAndColonSeparatedRecord("A:B,C:D");
    assertEquals(record.toString(), "A:B,C:D");
    assertEquals(record.get("A"), "B");
    assertEquals(record.get("C"), "D");
    assertEquals(record.get("foo"), undefined);
  });

  it("allows setting entries", () => {
    const record = new CommaAndColonSeparatedRecord("A:B,C:D");
    record.set("A", "0");
    record.set("E", "1");
    assertEquals(record.toString(), "A:0,C:D,E:1");
  });

  it("accepts cases of multiple-colon entries", () => {
    const record = new CommaAndColonSeparatedRecord("A:B:C,D");
    assertEquals(record.toString(), "A:B:C,D:");
    assertEquals(record.get("A"), "B:C");
    assertEquals(record.get("D"), "");
  });

  it("is case-insensitive", () => {
    const record = new CommaAndColonSeparatedRecord("foo:bar,FOO:BAR");
    assertEquals(record.toString(), "foo:BAR");
    assertEquals(record.get("FOO"), "BAR");
    assertEquals(record.get("foo"), "BAR");
    record.set("FOO", "baz");
    assertEquals(record.toString(), "foo:baz");
  });
});

describe("TypeScript support", () => {
  it("allows specifying typed search parameters", () => {
    const cs = new ConnectionString("mongodb://localhost/?tls=true&tls2=false");
    const sp = cs.typedSearchParams<{ tls: string }>();
    assertEquals(sp.get("tls"), "true");
    // @ts-expect-error should fail
    assertEquals(sp.get("tls2"), "false");
  });

  it("allows specifying typed comma-and-colon-separated-record types", () => {
    const record = new CommaAndColonSeparatedRecord<{ foo: string }>(
      "foo:bar,baz:quux",
    );
    assertEquals(record.get("foo"), "bar");
    // @ts-expect-error should fail
    assertEquals(record.get("baz"), "quux");
  });
});
