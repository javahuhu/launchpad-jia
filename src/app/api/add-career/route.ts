// app/api/add-career/route.ts  (Next.js app router example)
import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB"; // adjust path if different
import { guid } from "@/lib/Utils";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const required = [
      "jobTitle",
      "description",
      "questions",
      "location",
      "workSetup",
      "orgID",
      "createdBy",
    ];
    for (const k of required) {
      if (!body[k]) {
        return NextResponse.json(
          { error: `${k} is required` },
          { status: 400 }
        );
      }
    }

    let orgObjectId: ObjectId | null = null;
    try {
      orgObjectId = new ObjectId(body.orgID);
    } catch (err) {
      return NextResponse.json({ error: "Invalid orgID" }, { status: 400 });
    }

    const { db, client } = await connectMongoDB();

    const orgDetails = await db
      .collection("organizations")
      .aggregate([
        { $match: { _id: orgObjectId } },
        {
          $lookup: {
            from: "organization-plans",
            let: { planId: "$planId" },
            pipeline: [
              { $addFields: { _idStr: { $toString: "$_id" } } },
              {
                $match: {
                  $expr: { $eq: ["$_idStr", { $toString: "$$planId" }] },
                },
              },
            ],
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    if (!orgDetails || orgDetails.length === 0) {
      try {
        await client.close();
      } catch (_) {}
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const planJobLimit = Number(orgDetails[0]?.plan?.jobLimit ?? 3);
    const extraSlots = Number(orgDetails[0]?.extraJobSlots ?? 0);
    const jobLimitTotal = isNaN(planJobLimit)
      ? 3
      : planJobLimit + (isNaN(extraSlots) ? 0 : extraSlots);

    const totalActiveCareers = await db.collection("careers").countDocuments({
      orgID: body.orgID,
      status: { $in: ["active", "Published"] },
    });

    if (totalActiveCareers >= jobLimitTotal) {
      try {
        await client.close();
      } catch (_) {}
      return NextResponse.json(
        { error: "You have reached the maximum number of jobs for your plan" },
        { status: 400 }
      );
    }

    const careerDoc = {
      id: guid(),
      jobTitle: body.jobTitle,
      description: body.description,
      questions: body.questions,
      location: body.location,
      workSetup: body.workSetup,
      workSetupRemarks: body.workSetupRemarks || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEditedBy: body.lastEditedBy || body.createdBy,
      createdBy: body.createdBy,
      status: body.status || "active",
      screeningSetting: body.screeningSetting || null,
      orgID: body.orgID,
      requireVideo: !!body.requireVideo,
      lastActivityAt: new Date(),
      salaryNegotiable: !!body.salaryNegotiable,
      minimumSalary:
        typeof body.minimumSalary === "number" ? body.minimumSalary : null,
      maximumSalary:
        typeof body.maximumSalary === "number" ? body.maximumSalary : null,
      country: body.country || null,
      province: body.province || null,
      employmentType: body.employmentType || null,
      teamAccess: Array.isArray(body.teamAccess) ? body.teamAccess : [],
    };

    const result = await db.collection("careers").insertOne(careerDoc);

    try {
      await client.close();
    } catch (_) {}

    return NextResponse.json({
      message: "Career added successfully",
      career: careerDoc,
      insertedId: result.insertedId,
    });
  } catch (err: any) {
    console.error("Error in add-career route:", err);

    const isMongoNetError =
      /timeout|ECONNREFUSED|MongoNetworkError|MongoNetworkTimeoutError/i.test(
        String(err?.message ?? "")
      );

    const msg = isMongoNetError
      ? "Database connection failed. Check your MONGODB_URI and network connectivity."
      : err?.message ?? "Internal server error";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
